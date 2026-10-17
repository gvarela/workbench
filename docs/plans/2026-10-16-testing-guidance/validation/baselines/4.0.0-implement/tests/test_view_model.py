from rides.view_model import format_distance


def test_formats_with_one_decimal():
    assert format_distance(12.34) == "12.3 km"


def test_keeps_a_whole_number_whole():
    assert format_distance(5) == "5 km"


def test_rounds_half_up():
    assert format_distance(2.25) == "2.3 km"
