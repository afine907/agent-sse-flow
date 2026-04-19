import type { Meta, StoryObj } from '@storybook/react';
import { TokensBadge } from '../components/primitives/TokensBadge';
import { PriceBadge } from '../components/primitives/PriceBadge';

const meta: Meta<typeof TokensBadge> = {
  title: 'Primitives/Tokens & Price',
  component: TokensBadge,
  tags: ['autodocs'],
};

export default meta;

export const Tokens: StoryObj<typeof TokensBadge> = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <TokensBadge tokens={50} />
      <TokensBadge tokens={500} />
      <TokensBadge tokens={5000} />
      <TokensBadge tokens={50000} />
      <TokensBadge tokens={500000} />
    </div>
  ),
};

export const Prices: StoryObj<typeof PriceBadge> = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <PriceBadge cost={0.0001} />
      <PriceBadge cost={0.001} />
      <PriceBadge cost={0.025} />
      <PriceBadge cost={0.15} />
      <PriceBadge cost={1.50} />
      <PriceBadge cost={15.0} />
    </div>
  ),
};

export const Combined: StoryObj = {
  render: () => (
    <div className="flex items-center gap-4 p-3 rounded-lg border border-ts-border bg-ts-background">
      <TokensBadge tokens={2500} />
      <PriceBadge cost={0.025} />
    </div>
  ),
};
