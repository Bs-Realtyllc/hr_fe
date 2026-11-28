import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Testing Library only auto-cleans when test globals are enabled; we keep
// explicit imports, so unmount every render here.
afterEach(cleanup);
