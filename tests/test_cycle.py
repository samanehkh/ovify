from datetime import date, timedelta
import pytest
from services.prediction import (
    calculate_average_cycle_length,
    predict_next_period_start,
    predict_fertile_window,
)

def test_calculate_average_cycle_length_regular_cycles():
    cycle_dates = [
        (date(2023, 1, 1), date(2023, 1, 5)),
        (date(2023, 1, 29), date(2023, 2, 2)),
        (date(2023, 2, 26), date(2023, 3, 2)),
    ]
    # Cycle lengths: (Jan 29 - Jan 1) = 28 days, (Feb 26 - Jan 29) = 28 days
    assert calculate_average_cycle_length(cycle_dates) == 28

def test_calculate_average_cycle_length_irregular_cycles():
    cycle_dates = [
        (date(2023, 1, 1), date(2023, 1, 5)),
        (date(2023, 1, 30), date(2023, 2, 3)), # 29 days
        (date(2023, 3, 1), date(2023, 3, 5)),  # 30 days
    ]
    # Cycle lengths: 29, 30. Average = 29.5, rounded to 30
    assert calculate_average_cycle_length(cycle_dates) == 30

def test_calculate_average_cycle_length_insufficient_data():
    cycle_dates = [
        (date(2023, 1, 1), date(2023, 1, 5)),
    ]
    assert calculate_average_cycle_length(cycle_dates) is None

def test_calculate_average_cycle_length_empty_data():
    cycle_dates = []
    assert calculate_average_cycle_length(cycle_dates) is None

def test_predict_next_period_start():
    last_period_start = date(2023, 3, 1)
    average_cycle_length = 28
    expected_next_period_start = date(2023, 3, 29)
    assert predict_next_period_start(last_period_start, average_cycle_length) == expected_next_period_start

def test_predict_fertile_window():
    predicted_next_period_start = date(2023, 3, 29)
    average_cycle_length = 28 # This is used to calculate ovulation day (next_period - 14)
    expected_fertile_window_start = date(2023, 3, 10) # (Mar 29 - 14) - 5 = Mar 15 - 5 = Mar 10
    expected_fertile_window_end = date(2023, 3, 15)   # Mar 29 - 14 = Mar 15
    assert predict_fertile_window(predicted_next_period_start, average_cycle_length) == (expected_fertile_window_start, expected_fertile_window_end)
