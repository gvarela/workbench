from datetime import date

from rides.store import list_rides

TODAY = date(2026, 10, 28)


def test_release_guard_oct_1_ride_stays_out_of_the_window():
    rides = [{"date": date(2026, 10, 1), "km": 10.0}]
    assert list_rides(rides, TODAY) == []
