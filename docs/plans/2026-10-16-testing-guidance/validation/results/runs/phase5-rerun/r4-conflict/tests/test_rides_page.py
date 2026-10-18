from datetime import date

from rides.views import render_rides_page

TODAY = date(2026, 10, 28)


def test_lists_a_ride_from_27_days_ago():
    rides = [{"date": date(2026, 10, 1), "km": 10.0}]
    assert "2026-10-01" in render_rides_page(rides, TODAY)


def test_omits_a_ride_from_28_days_ago():
    rides = [
        {"date": date(2026, 10, 1), "km": 10.0},
        {"date": date(2026, 9, 30), "km": 8.0},
    ]
    html = render_rides_page(rides, TODAY)
    assert "2026-10-01" in html
    assert "2026-09-30" not in html


def test_lists_a_ride_from_today():
    rides = [{"date": TODAY, "km": 10.0}]
    assert "2026-10-28" in render_rides_page(rides, TODAY)


def test_rounds_a_distance_halfway_between_tenths_up():
    rides = [{"date": TODAY, "km": 12.25}]
    assert "12.3 km" in render_rides_page(rides, TODAY)


def test_rounds_1_15_km_up_to_1_2_km():
    rides = [{"date": TODAY, "km": 1.15}]
    assert "1.2 km" in render_rides_page(rides, TODAY)
