import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useArtifactsStore = create(
    persist(
        (set, get) => ({
            artifacts: [],
            activeArtifactId: null,

            addArtifact: (artifact) => {
                const newArtifact = {
                    id: uuidv4(),
                    createdAt: new Date().toISOString(),
                    type: 'code', // or 'document'
                    language: 'javascript', // default
                    content: '',
                    title: 'New Artifact',
                    ...artifact
                };
                set((state) => ({
                    artifacts: [newArtifact, ...state.artifacts],
                    activeArtifactId: newArtifact.id
                }));
                return newArtifact;
            },

            updateArtifact: (id, updates) => {
                set((state) => ({
                    artifacts: state.artifacts.map((a) => (a.id === id ? { ...a, ...updates } : a))
                }));
            },

            deleteArtifact: (id) => {
                set((state) => ({
                    artifacts: state.artifacts.filter((a) => a.id !== id),
                    activeArtifactId: state.activeArtifactId === id ? null : state.activeArtifactId
                }));
            },

            setActiveArtifact: (id) => set({ activeArtifactId: id }),
        }),
        {
            name: 'artifacts-storage',
        }
    )
);

export default useArtifactsStore;
