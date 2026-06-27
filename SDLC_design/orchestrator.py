import os
import json
from typing import List, Dict, TypedDict
from langgraph.graph import StateGraph, END

# ==========================================
# 1. State Definition
# ==========================================

class SDLCState(TypedDict):
    spec: str
    plan: str
    tasks: List[dict]
    code_diffs: Dict[str, str]
    test_results: dict
    security_report: dict
    critic_feedback: List[str]
    status: str
    iteration: int
    max_iterations: int

# ==========================================
# 2. Node Function Stubs (Agent Actions)
# ==========================================

def architecture_agent(state: SDLCState) -> Dict:
    """Reads spec.md and generates plan.md + tasks.md"""
    print("--- [Architecture Agent Node] Designing technical plan ---")
    # In implementation, this will query Gemini Pro with system prompt + constitution.md
    return {
        "plan": "Mock Technical Plan: provision burtsable PostgreSQL, create schemas",
        "tasks": [{"id": 1, "description": "Create Postgres models", "done": False}],
        "status": "planning",
        "iteration": state.get("iteration", 0)
    }

def developer_agent(state: SDLCState) -> Dict:
    """Reads tasks/plan and generates code files"""
    print(f"--- [Developer Agent Node] Implementing tasks (Iteration: {state['iteration']}) ---")
    # In implementation, this will query Gemini Flash to write source code
    return {
        "code_diffs": {"src/models.py": "class User(BaseModel): ..."},
        "status": "implementing"
    }

def qa_agent(state: SDLCState) -> Dict:
    """Runs tests and decides pass/fail (loops back on fail)"""
    print("--- [QA / Critic Agent Node] Executing test suite ---")
    # In implementation, this will execute pytest locally and parse output logs
    mock_passed = state["iteration"] >= 1  # Mock pass on iteration 1
    
    test_results = {"passed": mock_passed, "log": "Tests passed" if mock_passed else "SyntaxError on models.py line 4"}
    critic_feedback = [] if mock_passed else ["Fix import syntax error in models.py"]
    
    # Increment iteration counter on failure
    next_iteration = state["iteration"] if mock_passed else state["iteration"] + 1
    
    return {
        "test_results": test_results,
        "critic_feedback": critic_feedback,
        "iteration": next_iteration,
        "status": "verifying"
    }

def secops_agent(state: SDLCState) -> Dict:
    """Scans IaC files with Checkov/Trivy and outputs report"""
    print("--- [SecOps Agent Node] Auditing Infrastructure as Code ---")
    # In implementation, this runs Checkov/Trivy in the shell
    return {
        "security_report": {"vulnerabilities_found": 0, "status": "secure"},
        "status": "approved"
    }

# ==========================================
# 3. Conditional Edge Logic
# ==========================================

def should_retry(state: SDLCState) -> str:
    """Decides whether to retry coding or halt (success or failure)"""
    if state["test_results"].get("passed"):
        print("--- [Routing] QA Passed! Proceeding to SecOps scan ---")
        return "secops"
    
    if state["iteration"] >= state["max_iterations"]:
        print("--- [Routing] Hard iteration cap reached! Halting swarm for human review ---")
        return "failed"
    
    print(f"--- [Routing] QA Failed. Retrying code fixes (Attempt {state['iteration']}/{state['max_iterations']}) ---")
    return "retry"

# ==========================================
# 4. Graph Construction
# ==========================================

workflow = StateGraph(SDLCState)

# Add node definitions
workflow.add_node("architect", architecture_agent)
workflow.add_node("developer", developer_agent)
workflow.add_node("qa_critic", qa_agent)
workflow.add_node("secops", secops_agent)

# Set entrypoint
workflow.set_entry_point("architect")

# Static transitions
workflow.add_edge("architect", "developer")
workflow.add_edge("developer", "qa_critic")

# Conditional transition from QA Agent
workflow.add_conditional_edges(
    "qa_critic",
    should_retry,
    {
        "secops": "secops",
        "retry": "developer",
        "failed": END
    }
)

# Terminate after SecOps
workflow.add_edge("secops", END)

# Compile the LangGraph engine
app = workflow.compile()

# ==========================================
# 5. Pipeline Entry Point
# ==========================================

if __name__ == "__main__":
    print("=== [SDLC Swarm Pipeline] Starting Orchestrator ===")
    
    # State Directory Setup
    state_dir = ".spec-kit/state"
    state_file = os.path.join(state_dir, "sdlc_state.json")
    os.makedirs(state_dir, exist_ok=True)
    
    # Restore last state if it exists, otherwise initialize new
    initial_state = {
        "spec": "",
        "plan": "",
        "tasks": [],
        "code_diffs": {},
        "test_results": {},
        "security_report": {},
        "critic_feedback": [],
        "status": "init",
        "iteration": 0,
        "max_iterations": 3
    }
    
    if os.path.exists(state_file):
        try:
            with open(state_file, "r") as f:
                initial_state = json.load(f)
                print(f"--- Restored previous state from iteration {initial_state.get('iteration')} ---")
        except Exception as e:
            print(f"Failed to load state file: {e}. Starting fresh.")

    # Run LangGraph Graph App
    final_output = app.invoke(initial_state)
    
    # Persist Final State
    with open(state_file, "w") as f:
        json.dump(final_output, f, indent=2)
        print("--- Swarm State Saved Successfully ---")
        
    print("=== [SDLC Swarm Pipeline] Orchestrator Finished ===")
