import re
from datetime import date, timedelta

FORMULARY = {
    "gonal-f": {"name": "Gonal-F", "route": "Subcutaneous", "default_time": "20:00:00"},
    "gonalf": {"name": "Gonal-F", "route": "Subcutaneous", "default_time": "20:00:00"},
    "menopur": {"name": "Menopur", "route": "Subcutaneous", "default_time": "20:00:00"},
    "cetrotide": {"name": "Cetrotide", "route": "Subcutaneous", "default_time": "08:00:00"},
    "ovitrelle": {"name": "Ovitrelle", "route": "Subcutaneous", "default_time": "22:00:00"}
}

def parse_protocol_text(text: str) -> dict:
    """
    Parses natural language protocol description text and extracts structured medications,
    times, dosages, start and end dates. Highlights any unrecognized drugs.
    """
    parsed_meds = []
    unrecognized = []
    
    # 1. Look for drug patterns: name + dosage
    # Match strings like "Gonal-F 150 IU", "Gonal-X 150 IU", "Cetrotide 0.25mg"
    # Pattern: drug name word, optional space, dosage (digits + optional decimal + space + IU/mg/mcg)
    pattern = r'\b([A-Za-z0-9\-]+)\s+(\d+(?:\.\d+)?\s*(?:IU|mg|mcg))\b'
    matches = re.findall(pattern, text)
    
    # Track context clauses by splitting text
    clauses = re.split(r'[,;]|\.(?!\d)|\band\b', text)
    
    for match in matches:
        raw_name, dosage = match
        name_lower = raw_name.lower()
        
        # Check if in formulary
        matched_key = None
        for key in FORMULARY.keys():
            if key in name_lower or name_lower in key:
                matched_key = key
                break
                
        if matched_key:
            info = FORMULARY[matched_key]
            
            # Find the clause context to extract time and start day
            context = ""
            for cl in clauses:
                if raw_name in cl:
                    context = cl
                    break
            
            # 2. Extract scheduled time
            scheduled_time = info["default_time"]
            time_match = re.search(r'\bat\s*(\d+(?::\d+)?)\s*(AM|PM|am|pm)?\b', context, re.IGNORECASE)
            if time_match:
                time_str = time_match.group(1)
                ampm = time_match.group(2)
                
                try:
                    if ampm:
                        ampm = ampm.upper()
                        if ":" in time_str:
                            h, m = map(int, time_str.split(":"))
                        else:
                            h = int(time_str)
                            m = 0
                        if ampm == "PM" and h < 12:
                            h += 12
                        elif ampm == "AM" and h == 12:
                            h = 0
                        scheduled_time = f"{h:02d}:{m:02d}:00"
                    else:
                        if ":" in time_str:
                            h, m = map(int, time_str.split(":"))
                        else:
                            h = int(time_str)
                            m = 0
                        scheduled_time = f"{h:02d}:{m:02d}:00"
                except Exception:
                    pass # Fallback to default time if parsing fails
            
            # 3. Extract start date
            start_date = date.today() + timedelta(days=1) # Default to tomorrow
            if "tomorrow" in context.lower():
                start_date = date.today() + timedelta(days=1)
            else:
                day_match = re.search(r'\b(?:Day|day)\s*(\d+)\b', context)
                if day_match:
                    try:
                        day_num = int(day_match.group(1))
                        start_date = date.today() + timedelta(days=day_num - 1)
                    except Exception:
                        pass
            
            # End date defaults to 12 days cycle duration (start_date + 11 days)
            end_date = start_date + timedelta(days=11)
            
            parsed_meds.append({
                "name": info["name"],
                "dosage": dosage,
                "route": info["route"],
                "scheduled_time": scheduled_time,
                "start_date": start_date,
                "end_date": end_date,
                "flagged": False
            })
        else:
            unrecognized.append({
                "text": f"{raw_name} {dosage}",
                "message": "We couldn't identify this medication. Please select from the dropdown."
            })
            
    return {
        "parsed_medications": parsed_meds,
        "unrecognized_medications": unrecognized
    }
