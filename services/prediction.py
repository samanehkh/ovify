from datetime import date, timedelta
from typing import List, Optional

def calculate_average_cycle_length(cycle_dates: List[tuple[date, date]]) -> Optional[int]:
    """
    Calculates the average cycle length from a list of (start_date, end_date) tuples.
    A cycle length is the number of days from the start of one period to the start of the next.
    """
    if not cycle_dates or len(cycle_dates) < 2:
        return None

    # Sort cycles by start date to ensure correct calculation
    sorted_cycles = sorted(cycle_dates, key=lambda x: x[0])

    cycle_lengths = []
    for i in range(len(sorted_cycles) - 1):
        # Cycle length is the number of days from the start of one period to the start of the next
        length = (sorted_cycles[i+1][0] - sorted_cycles[i][0]).days
        cycle_lengths.append(length)

    if not cycle_lengths:
        return None

    return round(sum(cycle_lengths) / len(cycle_lengths))

def predict_next_period_start(last_period_start: date, average_cycle_length: int) -> date:
    """
    Predicts the start date of the next period.
    """
    return last_period_start + timedelta(days=average_cycle_length)

def predict_fertile_window(predicted_next_period_start: date, average_cycle_length: int) -> tuple[date, date]:
    """
    Predicts the fertile window (ovulation day - 5 days).
    Ovulation is typically 14 days before the next period starts.
    """
    ovulation_day = predicted_next_period_start - timedelta(days=14)
    fertile_window_start = ovulation_day - timedelta(days=5)
    fertile_window_end = ovulation_day
    return fertile_window_start, fertile_window_end
