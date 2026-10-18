from rides.view_model import format_distance


def test_formats_with_one_decimal():
    assert format_distance(12.34) == "12.3 km"


def test_rounds_a_halfway_distance_up():
    assert format_distance(12.25) == "12.3 km"


def test_rounds_a_halfway_distance_up_when_the_float_is_stored_just_below():
    # 1.15 is stored as 1.149999... in binary floating point
    assert format_distance(1.15) == "1.2 km"


def test_keeps_a_whole_number_whole():
    assert format_distance(5) == "5 km"


def test_keeps_a_trailing_zero_on_a_whole_float():
    assert format_distance(10.0) == "10.0 km"
