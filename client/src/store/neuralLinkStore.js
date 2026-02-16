import { create } from 'zustand';

const useNeuralLinkStore = create((set, get) => ({
    nodes: [
        { id: 'brain', type: 'brain', label: 'Core', status: 'idle' },
        { id: 'google', type: 'server', label: 'Google', status: 'idle' },
        { id: 'browser', type: 'server', label: 'Browser', status: 'idle' },
        { id: 'echo', type: 'server', label: 'Echo', status: 'idle' },
    ],
    links: [],
    signals: [],
    logs: [],
    isMemoryInspectorOpen: false,
    workspaceView: 'browser', // 'browser' | 'artifacts'

    // Actions
    toggleMemoryInspector: () => set(state => ({ isMemoryInspectorOpen: !state.isMemoryInspectorOpen })),
    setWorkspaceView: (view) => set({ workspaceView: view }),
    activateNode: (nodeId) => {
        set((state) => ({
            nodes: state.nodes.map((n) =>
                n.id === nodeId ? { ...n, status: 'active' } : n
            ),
        }));

        // Auto-deactivate after delay
        setTimeout(() => {
            set((state) => ({
                nodes: state.nodes.map((n) =>
                    n.id === nodeId ? { ...n, status: 'idle' } : n
                ),
            }));
        }, 2000);
    },

    emitSignal: (from, to, payload = {}) => {
        const id = Math.random().toString(36).substr(2, 9);
        set((state) => ({
            signals: [...state.signals, { id, from, to, ...payload }]
        }));

        // Remove signal after animation duration
        setTimeout(() => {
            set(state => ({
                signals: state.signals.filter(s => s.id !== id)
            }));
        }, 1500);
    },

    addLog: (text) => {
        set(state => ({
            logs: [{ id: Date.now(), text }, ...state.logs].slice(0, 5)
        }));
    }
}));

export default useNeuralLinkStore;
