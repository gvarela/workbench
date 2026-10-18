from datetime import date

from rides.views import render_rides_page

TODAY = date(2026, 10, 28)
RIDE_ITEM = '<li class="ride">'


def test_lists_a_ride_from_27_days_ago():
    rides = [{"date": date(2026, 10, 1), "km": 10.0}]
    page = render_rides_page(rides, TODAY)
    assert page.count(RIDE_ITEM) == 1
    assert "2026-10-01" in page


def test_does_not_list_a_ride_from_28_days_ago():
    rides = [{"date": date(2026, 9, 30), "km": 10.0}]
    page = render_rides_page(rides, TODAY)
    assert "2026-09-30" not in page
    assert page.count(RIDE_ITEM) == 0


def test_lists_only_the_in_window_ride_when_28_and_27_days_ago_are_together():
    rides = [
        {"date": date(2026, 9, 30), "km": 10.0},
        {"date": date(2026, 10, 1), "km": 12.0},
    ]
    page = render_rides_page(rides, TODAY)
    assert page.count(RIDE_ITEM) == 1
    assert "2026-10-01" in page
    assert "2026-09-30" not in page


def test_lists_a_ride_from_today():
    rides = [{"date": TODAY, "km": 10.0}]
    page = render_rides_page(rides, TODAY)
    assert page.count(RIDE_ITEM) == 1
    assert "2026-10-28" in page
