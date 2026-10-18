from rides.view_model import format_distance


def test_formats_with_one_decimal():
    assert format_distance(12.34) == "12.3 km"


def test_rounds_to_the_nearest_tenth():
    assert format_distance(12.25) == "12.3 km"


def test_keeps_a_whole_number_whole():
    assert format_distance(5) == "5 km"


def test_rounds_a_half_up_to_the_next_tenth():
    assert format_distance(2.25) == "2.3 km"


def test_rounds_by_decimal_text_not_binary_float_value():
    # float 1.15 is stored just below 1.15, but reads as 1.15
    assert format_distance(1.15) == "1.2 km"


def test_keeps_one_decimal_for_a_whole_valued_float():
    assert format_distance(10.0) == "10.0 km"
