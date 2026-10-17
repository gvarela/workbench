from datetime import date

from rides.views import render_today_page


def test_today_page_has_no_stray_marker():
    body = render_today_page([], date(2026, 10, 28))
    assert "x" not in body
