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
    assert.ok(html.includes('aria-label="Kiwi Commuter"'), 'Must render Kiwi logo icon with Kiwi Commuter aria-label');
    assert.ok(html.includes('id="feedback-name"'), 'Must have Name input');
    assert.ok(html.includes('id="feedback-contact"'), 'Must have Contact input');
    assert.ok(html.includes('id="feedback-message"'), 'Must have Message textarea');
    assert.ok(html.includes('Submit Feedback'), 'Must have Submit Feedback button');
  });

  it('renders rebranded success state with exact text and no GitHub link (TASK-55)', () => {
    const html = renderToStaticMarkup(
      React.createElement(FeedbackModal, { isOpen: true, onClose: () => {}, initialSuccess: true })
    );

    assert.ok(html.includes('Thank you for your feedback!'), 'Must render success heading');
    assert.ok(
      html.includes('Your feedback is recorded. Thank you for helping make Kiwi Commuter better.') ||
      html.includes('Your feedback has been successfully recorded.'),
      'Must render description text without banned words'
    );
    assert.strictEqual(
      html.includes('GitHub'),
      false,
      'Must completely remove GitHub references from success state'
    );
    assert.strictEqual(
      html.includes('View Issue'),
      false,
      'Must completely remove View Issue link from success state'
    );
    assert.strictEqual(
      html.includes('<a'),
      false,
      'Must not contain any anchor link tags in success state'
    );
    assert.ok(html.includes('Done'), 'Must render Done button');
  });
});
