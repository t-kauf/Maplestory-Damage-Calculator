/**
 * Lightweight EventEmitter for vanilla TypeScript
 * Provides pub/sub pattern for decoupled communication
 */

type EventCallback = (...args: any[]) => void;

export class EventEmitter {
    private events: Record<string, EventCallback[]> = {};

    /**
     * Subscribe to an event
     * @param event - Event name
     * @param callback - Callback function
     * @returns Unsubscribe function
     */
    on(event: string, callback: EventCallback): () => void {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);

        // Return unsubscribe function
        return () => {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        };
    }

    /**
     * Emit an event
     * @param event - Event name
     * @param args - Arguments to pass to callbacks
     */
    emit(event: string, ...args: any[]): void {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(...args));
        }
    }

    /**
     * Remove all listeners for an event (or all events)
     * @param event - Event name (omit to clear all)
     */
    clear(event?: string): void {
        if (event) {
            delete this.events[event];
        } else {
            this.events = {};
        }
    }

    /**
     * Get listener count for an event
     * @param event - Event name
     */
    listenerCount(event: string): number {
        return this.events[event]?.length ?? 0;
    }
}

export function debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
     let timeout: ReturnType<typeof setTimeout> | null = null;
     return ((...args: any[]) => {
         if (timeout) clearTimeout(timeout);
         timeout = setTimeout(() => func(...args), wait);
     }) as T;
 }