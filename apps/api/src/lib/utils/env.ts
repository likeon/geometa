import { config } from '@api/config';

export const prod = config.NODE_ENV === 'production';
