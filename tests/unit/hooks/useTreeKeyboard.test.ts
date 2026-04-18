/**
 * useTreeKeyboard Hook Unit Tests
 * Tests for src/hooks/useTreeKeyboard.ts
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTreeKeyboard } from '@tracescope/hooks/useTreeKeyboard';

describe('useTreeKeyboard', () => {
  describe('basic functionality', () => {
    it('should return a function', () => {
      const onToggle = vi.fn();
      const { result } = renderHook(() =>
        useTreeKeyboard({ hasChildren: true, onToggle })
      );

      expect(typeof result.current).toBe('function');
    });

    it('should call onToggle when Enter key is pressed', () => {
      const onToggle = vi.fn();
      const { result } = renderHook(() =>
        useTreeKeyboard({ hasChildren: true, onToggle })
      );

      const event = {
        key: 'Enter',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      result.current(event);

      expect(onToggle).toHaveBeenCalledTimes(1);
      expect(event.preventDefault).toHaveBeenCalledTimes(1);
    });

    it('should call onToggle when Space key is pressed', () => {
      const onToggle = vi.fn();
      const { result } = renderHook(() =>
        useTreeKeyboard({ hasChildren: true, onToggle })
      );

      const event = {
        key: ' ',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      result.current(event);

      expect(onToggle).toHaveBeenCalledTimes(1);
      expect(event.preventDefault).toHaveBeenCalledTimes(1);
    });

    it('should not call onToggle when hasChildren is false', () => {
      const onToggle = vi.fn();
      const { result } = renderHook(() =>
        useTreeKeyboard({ hasChildren: false, onToggle })
      );

      const event = {
        key: 'Enter',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      result.current(event);

      expect(onToggle).not.toHaveBeenCalled();
    });

    it('should not call onToggle for other keys', () => {
      const onToggle = vi.fn();
      const { result } = renderHook(() =>
        useTreeKeyboard({ hasChildren: true, onToggle })
      );

      const keys = ['Escape', 'Tab', 'ArrowUp', 'ArrowDown', 'a', '1'];

      keys.forEach((key) => {
        const event = {
          key,
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent;

        result.current(event);
      });

      expect(onToggle).not.toHaveBeenCalled();
    });

    it('should not prevent default for other keys', () => {
      const onToggle = vi.fn();
      const { result } = renderHook(() =>
        useTreeKeyboard({ hasChildren: true, onToggle })
      );

      const event = {
        key: 'Escape',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      result.current(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('memoization', () => {
    it('should return the same function if options do not change', () => {
      const onToggle = vi.fn();
      const { result, rerender } = renderHook(
        ({ hasChildren, onToggle }) =>
          useTreeKeyboard({ hasChildren, onToggle }),
        { initialProps: { hasChildren: true, onToggle } }
      );

      const firstResult = result.current;

      rerender({ hasChildren: true, onToggle });

      expect(result.current).toBe(firstResult);
    });

    it('should return new function if hasChildren changes', () => {
      const onToggle = vi.fn();
      const { result, rerender } = renderHook(
        ({ hasChildren, onToggle }) =>
          useTreeKeyboard({ hasChildren, onToggle }),
        { initialProps: { hasChildren: true, onToggle } }
      );

      const firstResult = result.current;

      rerender({ hasChildren: false, onToggle });

      expect(result.current).not.toBe(firstResult);
    });

    it('should return new function if onToggle changes', () => {
      const onToggle1 = vi.fn();
      const onToggle2 = vi.fn();
      const { result, rerender } = renderHook(
        ({ hasChildren, onToggle }) =>
          useTreeKeyboard({ hasChildren, onToggle }),
        { initialProps: { hasChildren: true, onToggle: onToggle1 } }
      );

      const firstResult = result.current;

      rerender({ hasChildren: true, onToggle: onToggle2 });

      expect(result.current).not.toBe(firstResult);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined hasChildren', () => {
      const onToggle = vi.fn();
      const { result } = renderHook(() =>
        useTreeKeyboard({ 
          hasChildren: undefined as unknown as boolean, 
          onToggle 
        })
      );

      const event = {
        key: 'Enter',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      result.current(event);

      expect(onToggle).not.toHaveBeenCalled();
    });

    it('should handle null hasChildren', () => {
      const onToggle = vi.fn();
      const { result } = renderHook(() =>
        useTreeKeyboard({ 
          hasChildren: null as unknown as boolean, 
          onToggle 
        })
      );

      const event = {
        key: 'Enter',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      result.current(event);

      expect(onToggle).not.toHaveBeenCalled();
    });

    it('should work with empty options object', () => {
      const { result } = renderHook(() =>
        useTreeKeyboard({} as { hasChildren: boolean; onToggle: () => void })
      );

      expect(typeof result.current).toBe('function');
    });
  });
});
