from datetime import date

from rides.views import render_rides_page

TODAY = date(2026, 10, 28)


def test_lists_a_ride_from_27_days_ago_and_omits_one_from_28_days_ago():
    included = {"date": date(2026, 10, 1), "km": 10.0}
    excluded = {"date": date(2026, 9, 30), "km": 8.0}
    html = render_rides_page([included, excluded], TODAY)
    assert "2026-10-01" in html
    assert "2026-09-30" not in html


def test_lists_a_ride_dated_today_on_the_page():
    html = render_rides_page([{"date": TODAY, "km": 10.0}], TODAY)
    assert "2026-10-28" in html


def test_rounds_a_distance_halfway_between_two_tenths_up_to_12_3_km():
    html = render_rides_page([{"date": TODAY, "km": 12.25}], TODAY)
    assert "12.3 km" in html


def test_rounds_1_15_km_up_to_1_2_km():
    html = render_rides_page([{"date": TODAY, "km": 1.15}], TODAY)
    assert "1.2 km" in html
