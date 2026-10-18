from playwright.sync_api import expect


def test_wizard_opens_on_sleep_with_later_questions_hidden(page, wizard_url):
    page.goto(wizard_url)
    expect(page.locator('[data-question="sleep"]')).to_be_visible()
    expect(page.locator('[data-question="soreness"]')).to_be_hidden()


def test_answering_sleep_moves_focus_to_soreness_none_button(page, wizard_url):
    page.goto(wizard_url)
    page.locator('[data-question="sleep"] button[data-value="good"]').click()
    expect(page.locator('[data-question="soreness"]')).to_be_visible()
    expect(
        page.locator('[data-question="soreness"] button[data-value="none"]')
    ).to_be_focused()


def test_answering_soreness_moves_focus_to_mood_up_button(page, wizard_url):
    page.goto(wizard_url)
    page.locator('[data-question="sleep"] button[data-value="good"]').click()
    page.locator('[data-question="soreness"] button[data-value="some"]').click()
    expect(page.locator('[data-question="mood"]')).to_be_visible()
    expect(
        page.locator('[data-question="mood"] button[data-value="up"]')
    ).to_be_focused()
