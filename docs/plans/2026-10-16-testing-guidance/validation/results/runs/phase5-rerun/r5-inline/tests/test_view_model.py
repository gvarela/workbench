from rides.view_model import format_distance


def test_formats_with_one_decimal():
    assert format_distance(12.34) == "12.3 km"


def test_rounds_to_the_nearest_tenth():
    assert format_distance(12.25) == "12.3 km"


def test_rounds_a_distance_halfway_between_two_tenths_up_for_1_15():
    assert format_distance(1.15) == "1.2 km"


def test_keeps_one_decimal_on_a_float_with_a_zero_tenth():
    assert format_distance(10.0) == "10.0 km"


def test_keeps_a_whole_number_whole():
    assert format_distance(5) == "5 km"
