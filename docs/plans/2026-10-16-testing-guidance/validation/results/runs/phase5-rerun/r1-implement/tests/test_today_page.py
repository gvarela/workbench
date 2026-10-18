from datetime import date

from rides.views import render_today_page


TODAY = date(2026, 10, 28)


def test_today_page_shows_the_sum_of_todays_distances_only():
    rides = [
        {"date": date(2026, 10, 28), "km": 10.0},
        {"date": date(2026, 10, 28), "km": 2.5},
        {"date": date(2026, 10, 27), "km": 7.0},
    ]
    body = render_today_page(rides, TODAY)
    assert "Total: 12.5 km" in body


def test_today_page_has_no_stray_marker():
    body = render_today_page([], date(2026, 10, 28))
    assert "x" not in body
