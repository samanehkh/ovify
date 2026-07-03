import os
import sys
import json
import re
import subprocess
from typing import List, Dict, TypedDict
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.tools import tool
from langchain_core.messages import ToolMessage, AIMessage, HumanMessage, SystemMessage
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
    ui_approved: bool

# ==========================================
# 2. PII Scrubber (DLP Guardrail)
# ==========================================

def redact_pii(text: str) -> str:
    """Redacts UAE Emirates IDs, emails, and phone numbers to ensure DHA/MOHAP data compliance."""
    emirates_id_pattern = r"\b784-?[0-9]{4}-?[0-9]{7}-?[0-9]{1}\b"
    email_pattern = r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
    phone_pattern = r"\b(?:\+?971|0)?5[024568]-?[0-9]{7}\b"
    
    text = re.sub(emirates_id_pattern, "[REDACTED_EMIRATES_ID]", text)
    text = re.sub(email_pattern, "[REDACTED_EMAIL]", text)
    text = re.sub(phone_pattern, "[REDACTED_PHONE_NUMBER]", text)
    return text

# ==========================================
# 3. Model Gating & Instantiation
# ==========================================

API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    print("WARNING: GEMINI_API_KEY environment variable is not set. Execution will fail during API calls.")
    API_KEY = "MOCK_KEY_FOR_BUILD"

# Senior Architect Base Model (Gemini Pro for reasoning)
pro_base = ChatGoogleGenerativeAI(model="gemini-2.5-pro", google_api_key=API_KEY, temperature=0.1)
# Execution Model (Gemini Flash for speed/cost/fallback)
flash_model = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=API_KEY, temperature=0.2)

# ==========================================
# 4. Workspace Tools for Developer Agent
# ==========================================

@tool
def read_workspace_file(path: str) -> str:
    """Reads the contents of a file in the workspace repo. Use this to inspect source code."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return f"File {path} not found."
    except Exception as e:
        return f"Error reading file {path}: {e}"

@tool
def write_workspace_file(path: str, content: str) -> str:
    """Writes the complete contents to a file. Overwrites existing files. Do not use placeholders."""
    try:
        abs_path = os.path.abspath(path)
        workspace_root = os.path.abspath(os.getcwd())
        if not abs_path.startswith(workspace_root):
            return f"Security Error: Path {path} is outside workspace!"
            
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        with open(abs_path, "w", encoding="utf-8") as f:
            f.write(content)
        return f"Successfully wrote to {path}"
    except Exception as e:
        return f"Error writing file {path}: {e}"

@tool
def list_workspace_dir(path: str = ".") -> str:
    """Lists the files and folders inside the specified directory path."""
    try:
        abs_path = os.path.abspath(path)
        workspace_root = os.path.abspath(os.getcwd())
        if not abs_path.startswith(workspace_root):
            return f"Security Error: Path {path} is outside workspace!"
            
        items = os.listdir(abs_path)
        return json.dumps(items, indent=2)
    except Exception as e:
        return f"Error listing directory {path}: {e}"

@tool
def execute_test_command(command: str) -> str:
    """Executes a testing command in the shell. Limited to 'pytest' or 'flake8' commands."""
    allowed_prefixes = ["pytest", "pytest ", "flake8", "flake8 ", "python -m pytest"]
    if not any(command.startswith(prefix) for prefix in allowed_prefixes):
        return f"Security Error: Command '{command}' is not permitted! You can only execute pytest or flake8."
        
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=60)
        return f"STDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}\nExit Code: {result.returncode}"
    except subprocess.TimeoutExpired:
        return "Error: Command timed out after 60 seconds."
    except Exception as e:
        return f"Error executing command: {e}"

# ==========================================
# 5. Pydantic Validation Schemas
# ==========================================

class TaskItem(BaseModel):
    id: int = Field(description="Unique incremental integer ID starting at 1")
    description: str = Field(description="Granular developer task outlining what code to change/create")
    done: bool = Field(default=False, description="Must be False initially")

class ArchitectPlan(BaseModel):
    plan: str = Field(description="Detailed technical architecture design, specifications, and file mappings")
    tasks: List[TaskItem] = Field(description="Checklist of checkable development tasks")

class QAEvaluation(BaseModel):
    passed: bool = Field(description="True if the test suite succeeded and lints passed; False otherwise")
    critic_feedback: List[str] = Field(description="Detailed error feedback, test failure traces, and instructions if failed")

class SecOpsEvaluation(BaseModel):
    passed: bool = Field(description="True if scan checks pass with zero high/critical vulnerabilities; False otherwise")
    security_report: str = Field(description="Vulnerability scan summary and details of findings")

# ==========================================
# 6. Node Implementations
# ==========================================

def ui_designer_agent(state: SDLCState) -> Dict:
    """Acts as a Senior UI/UX Designer to implement high-fidelity, accessible UI mockups based on spec.md"""
    print("--- [UI/UX Designer Agent Node] Designing and writing user interfaces ---")
    
    spec_content = read_workspace_file.invoke({"path": ".spec-kit/spec.md"})
    constitution = read_workspace_file.invoke({"path": ".spec-kit/constitution.md"})
    
    system_prompt = f"""You are the Senior UI/UX Designer for Ovify, with 20 years of experience designing premium, accessible Digital Health and IVF applications.
Your job is to read the spec (spec.md) and system guidelines (constitution.md), and design/update the frontend interface (usually index.html).

DESIGN RULES:
1. Keep the interface extremely clean, warm, and professional (lavender #9E8CEF and blush #F4A0A0 accents on light ivory #F8F5F1 background).
2. Prioritize accessibility (contrasting text colors, proper screen-reader aria labels, prefers-reduced-motion compatibility).
3. Do not include cluttered medication confirmation/action buttons on the main screen unless requested in the spec.
4. Output complete code with no placeholders.

Constitution:
{constitution}
"""
    
    messages = [
        SystemMessage(content=redact_pii(system_prompt)),
        HumanMessage(content=f"Review the specification and update index.html to reflect the requested UI/UX features:\n{spec_content}")
    ]
    
    # Use tools to implement the UI design
    model_with_tools = flash_model.bind_tools([read_workspace_file, write_workspace_file, list_workspace_dir])
    
    for i in range(10):
        response = model_with_tools.invoke(messages)
        messages.append(response)
        
        if not response.tool_calls:
            break
            
        for tool_call in response.tool_calls:
            tool_name = tool_call["name"]
            tool_args = tool_call["args"]
            tool_id = tool_call["id"]
            
            if tool_name == "read_workspace_file":
                output = read_workspace_file.invoke(tool_args)
            elif tool_name == "write_workspace_file":
                output = write_workspace_file.invoke(tool_args)
            elif tool_name == "list_workspace_dir":
                output = list_workspace_dir.invoke(tool_args)
            else:
                output = f"Error: Tool {tool_name} not found."
                
            messages.append(ToolMessage(content=output, tool_call_id=tool_id))
            
    print("--- [UI/UX Designer Agent Node] UI implementation finished. Pending user approval. ---")
    return {
        "ui_approved": False,
        "status": "pending_ui_approval"
    }

def architecture_agent(state: SDLCState) -> Dict:
    """Reads spec.md, index.html and generates plan.md and tasks.md"""
    print("--- [Architecture Agent Node] Designing technical plan ---")
    
    spec_content = read_workspace_file.invoke({"path": ".spec-kit/spec.md"})
    constitution = read_workspace_file.invoke({"path": ".spec-kit/constitution.md"})
    ui_content = read_workspace_file.invoke({"path": "index.html"})
    
    system_prompt = f"""You are the Lead Solution Architect for Ovify, with 20 years of experience in cloud architecture, AI architecture, Azure architecture, application designing, API integrations, and legacy modernization, specialized in digital health architecting.
Your job is to read the user feature specification (spec.md), the system constitution (constitution.md), and the current UI/UX design (index.html), and design a high-fidelity technical implementation plan and a list of developer tasks.

Constitution:
{constitution}

Current UI/UX design (index.html):
{ui_content}

You must strictly conform your output to the required schema structure.
"""
    
    clean_prompt = redact_pii(system_prompt)
    structured_pro = pro_base.with_structured_output(ArchitectPlan)
    structured_flash = flash_model.with_structured_output(ArchitectPlan)
    structured_architect = structured_pro.with_fallbacks([structured_flash])
    
    result = structured_architect.invoke([
        SystemMessage(content=clean_prompt),
        HumanMessage(content=f"Here is the specification file:\n{spec_content}")
    ])
    
    # Save plan and tasks to spec-kit directory
    plan_path = ".spec-kit/plan.md"
    tasks_path = ".spec-kit/tasks.md"
    
    write_workspace_file.invoke({"path": plan_path, "content": result.plan})
    
    tasks_markdown = "\n".join([f"- [ ] {t.description}" for t in result.tasks])
    write_workspace_file.invoke({"path": tasks_path, "content": tasks_markdown})
    
    serialized_tasks = [{"id": t.id, "description": t.description, "done": t.done} for t in result.tasks]
    
    return {
        "plan": result.plan,
        "tasks": serialized_tasks,
        "status": "planning",
        "iteration": state.get("iteration", 0)
    }

def developer_agent(state: SDLCState) -> Dict:
    """Reads tasks/plan and generates code files"""
    print(f"--- [Developer Agent Node] Implementing tasks (Attempt {state['iteration']}/{state['max_iterations']}) ---")
    
    plan_text = state.get("plan", "")
    tasks_json = json.dumps(state.get("tasks", []), indent=2)
    constitution = read_workspace_file.invoke({"path": ".spec-kit/constitution.md"})
    feedback_text = "\n".join(state.get("critic_feedback", []))
    
    system_prompt = f"""You are the Developer Agent. Your job is to implement the changes specified in the Technical Plan and Task List below.
You must strictly follow the rules in the Constitution. If previous test runs failed, review the critic feedback and correct your implementation.

Constitution:
{constitution}

Technical Plan:
{plan_text}

Task List:
{tasks_json}

Previous QA Critic Feedback (if any):
{feedback_text}

INSTRUCTIONS:
1. Use the provided tools (read_workspace_file, write_workspace_file, list_workspace_dir) to inspect the workspace and write your code changes.
2. Implement robust, clean code. Do not write mock implementations or placeholders.
3. Once all tasks are complete, output a final message summarizing your changes.
"""
    
    messages = [
        SystemMessage(content=redact_pii(system_prompt)),
        HumanMessage(content="Start implementing the tasks. Call the necessary tools to read/write files.")
    ]
    
    # Tool execution loop
    model_with_tools = flash_model.bind_tools([read_workspace_file, write_workspace_file, list_workspace_dir])
    
    for i in range(10):  # Capped at 10 turns per run
        response = model_with_tools.invoke(messages)
        messages.append(response)
        
        if not response.tool_calls:
            break
            
        for tool_call in response.tool_calls:
            tool_name = tool_call["name"]
            tool_args = tool_call["args"]
            tool_id = tool_call["id"]
            
            if tool_name == "read_workspace_file":
                output = read_workspace_file.invoke(tool_args)
            elif tool_name == "write_workspace_file":
                output = write_workspace_file.invoke(tool_args)
            elif tool_name == "list_workspace_dir":
                output = list_workspace_dir.invoke(tool_args)
            else:
                output = f"Error: Tool {tool_name} not found."
                
            messages.append(ToolMessage(content=output, tool_call_id=tool_id))
            
    print("--- [Developer Agent Node] Implementation completed ---")
    return {
        "status": "implementing"
    }

def qa_agent(state: SDLCState) -> Dict:
    """Runs tests and decides pass/fail (loops back on fail)"""
    print("--- [QA / Critic Agent Node] Executing test suite ---")
    
    test_output = execute_test_command.invoke({"command": "python -m pytest"})
    print(f"Test Execution Output:\n{test_output}")
    
    system_prompt = """You are the QA / Critic Agent for Ovify. Your job is to analyze the test execution log and decide if the implementation passes verification.
If the tests passed (exit code 0), set passed=True. If the tests failed, set passed=False and provide constructive feedback for the Developer Agent to fix.
"""
    
    structured_qa = flash_model.with_structured_output(QAEvaluation)
    eval_result = structured_qa.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"Here is the pytest execution log:\n{test_output}")
    ])
    
    passed = eval_result.passed
    critic_feedback = eval_result.critic_feedback
    next_iteration = state["iteration"] if passed else state["iteration"] + 1
    
    return {
        "test_results": {"passed": passed, "log": test_output},
        "critic_feedback": critic_feedback,
        "iteration": next_iteration,
        "status": "verifying"
    }

def secops_agent(state: SDLCState) -> Dict:
    """Scans IaC files with Checkov/Trivy and outputs report"""
    print("--- [SecOps Agent Node] Auditing Infrastructure as Code ---")
    
    try:
        checkov_result = subprocess.run("checkov -d . --quiet", shell=True, capture_output=True, text=True, timeout=60)
        scan_log = checkov_result.stdout if checkov_result.stdout else "Checkov run completed with no stdout."
    except Exception as e:
        scan_log = f"Checkov scan failed to execute: {e}"
        
    system_prompt = """You are the SecOps Agent for Ovify. Your job is to analyze the security scan log and decide if the repository is secure.
If no critical vulnerabilities are found, set passed=True. Otherwise set passed=False.
"""
    
    structured_secops = flash_model.with_structured_output(SecOpsEvaluation)
    eval_result = structured_secops.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"Here is the security scan log:\n{scan_log}")
    ])
    
    return {
        "security_report": {"passed": eval_result.passed, "report": eval_result.security_report},
        "status": "approved" if eval_result.passed else "secops_failed"
    }

# ==========================================
# 7. Conditional Edge Logic
# ==========================================

def route_start(state: SDLCState) -> str:
    """If UI design is approved, proceed to architect. Otherwise start with UI designer."""
    if state.get("ui_approved"):
        print("--- [Routing] UI Approved! Proceeding to Architecture Agent ---")
        return "architect"
    print("--- [Routing] Starting with UI/UX Designer Agent ---")
    return "ui_designer"

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
# 8. Graph Construction
# ==========================================

workflow = StateGraph(SDLCState)

# Add node definitions
workflow.add_node("ui_designer", ui_designer_agent)
workflow.add_node("architect", architecture_agent)
workflow.add_node("developer", developer_agent)
workflow.add_node("qa_critic", qa_agent)
workflow.add_node("secops", secops_agent)

# Set conditional entry point
workflow.set_conditional_entry_point(
    route_start,
    {
        "ui_designer": "ui_designer",
        "architect": "architect"
    }
)

# Static transitions
workflow.add_edge("ui_designer", END)
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
# 9. Pipeline Entry Point
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
        "max_iterations": 3,
        "ui_approved": False
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
