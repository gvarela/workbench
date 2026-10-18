from datetime import date

from rides.store import list_rides

TODAY = date(2026, 10, 28)


def test_lists_a_ride_from_today():
    rides = [{"date": TODAY, "km": 10.0}]
    assert list_rides(rides, TODAY) == rides


def test_omits_rides_from_long_ago():
    old = {"date": date(2026, 8, 1), "km": 10.0}
    assert list_rides([old], TODAY) == []


def test_lists_newest_first():
    older = {"date": date(2026, 10, 20), "km": 5.0}
    newer = {"date": date(2026, 10, 25), "km": 7.0}
    assert list_rides([older, newer], TODAY) == [newer, older]
