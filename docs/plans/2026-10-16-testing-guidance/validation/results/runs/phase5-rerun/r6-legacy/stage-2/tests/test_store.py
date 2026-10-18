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


def test_lists_a_ride_from_27_days_ago_and_omits_one_from_28():
    day_27 = {"date": date(2026, 10, 1), "km": 10.0}
    day_28 = {"date": date(2026, 9, 30), "km": 10.0}
    assert list_rides([day_27, day_28], TODAY) == [day_27]
