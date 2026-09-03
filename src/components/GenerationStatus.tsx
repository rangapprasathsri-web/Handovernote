import React from 'react';
import { GenerationStatusBanner, GenerationStatusBannerProps } from './GenerationStatusBanner.js';

export const GenerationStatus: React.FC<GenerationStatusBannerProps> = (props) => {
  return <GenerationStatusBanner {...props} />;
};
