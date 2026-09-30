import assert from 'node:assert';
import { describe, it } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import FeedbackModal from '../FeedbackModal';
import FeedbackButton from '../FeedbackButton';

describe('src/components/FeedbackModal.tsx & FeedbackButton.tsx - US-49 In-App Feedback Reporter', () => {
  it('renders FeedbackButton header variant with icon and Feedback label', () => {
    const html = renderToStaticMarkup(
      React.createElement(FeedbackButton, { onClick: () => {}, variant: 'header' })
    );

    assert.ok(html.includes('<button'), 'Must render a button tag');
    assert.ok(html.includes('aria-label="Report Feedback"'), 'Must have aria-label');
    assert.ok(html.includes('Feedback'), 'Must display Feedback text');
  });

  it('renders FeedbackButton footer variant with Report Feedback label', () => {
    const html = renderToStaticMarkup(
      React.createElement(FeedbackButton, { onClick: () => {}, variant: 'footer' })
    );

    assert.ok(html.includes('<button'), 'Must render a button tag');
    assert.ok(html.includes('Report Feedback'), 'Must display Report Feedback text');
  });

  it('renders nothing when FeedbackModal is closed (isOpen: false)', () => {
    const html = renderToStaticMarkup(
      React.createElement(FeedbackModal, { isOpen: false, onClose: () => {} })
    );

    assert.strictEqual(html, '');
  });

  it('renders modal with Name, Contact, Message inputs and submit button when isOpen is true', () => {
    const html = renderToStaticMarkup(
      React.createElement(FeedbackModal, { isOpen: true, onClose: () => {} })
    );

    assert.ok(html.includes('role="dialog"'), 'Must render dialog role');
    assert.ok(html.includes('aria-modal="true"'), 'Must have aria-modal="true"');
    assert.ok(html.includes('Report Feedback'), 'Must render title Report Feedback');
    assert.ok(html.includes('id="feedback-name"'), 'Must have Name input');
    assert.ok(html.includes('id="feedback-contact"'), 'Must have Contact input');
    assert.ok(html.includes('id="feedback-message"'), 'Must have Message textarea');
    assert.ok(html.includes('Submit Feedback'), 'Must have Submit Feedback button');
  });
});
