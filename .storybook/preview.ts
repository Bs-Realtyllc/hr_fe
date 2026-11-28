import type { Preview } from '@storybook/react';
import '../src/styles/global.css';

const preview: Preview = {
  parameters: {
    layout: 'centered',
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    // Fail the a11y panel on violations, not just warn.
    a11y: { test: 'error' },
    nextjs: { appDirectory: true },
  },
};

export default preview;
