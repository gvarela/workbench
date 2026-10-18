from datetime import date

from rides.views import render_rides_page

TODAY = date(2026, 10, 28)


def test_lists_a_ride_27_days_old_and_omits_one_28_days_old():
    rides = [
        {"date": date(2026, 10, 1), "km": 10.0},
        {"date": date(2026, 9, 30), "km": 8.0},
    ]
    page = render_rides_page(rides, TODAY)
    assert "2026-10-01" in page
    assert "2026-09-30" not in page


def test_lists_a_ride_dated_today():
    page = render_rides_page([{"date": TODAY, "km": 3.0}], TODAY)
    assert "2026-10-28" in page


def test_distance_halfway_between_two_tenths_rounds_up():
    page = render_rides_page([{"date": TODAY, "km": 12.25}], TODAY)
    assert "12.3 km" in page


def test_distance_of_1_15_km_shows_as_1_2_km():
    page = render_rides_page([{"date": TODAY, "km": 1.15}], TODAY)
    assert "1.2 km" in page
