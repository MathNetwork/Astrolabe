// The documentation registry — one entry per MDX file in `content/<section>/`.
// Files are named `<NN>-<slug>.mdx`; the numeric prefix orders the sidebar, so
// reordering docs is just renaming files. This registry carries the metadata.
export interface DocMeta {
  slug: string // file is content/<section lowercased>/<NN>-<slug>.mdx
  title: string
  eyebrow: string
  section: 'Docs'
}

export const DOCS: DocMeta[] = [
  {
    slug: 'data-model',
    title: '.astrolabe',
    eyebrow: 'The store, defined',
    section: 'Docs',
  },
  {
    slug: 'authoring',
    title: 'Writing with Cards',
    eyebrow: 'Documents, entryblock & entryref',
    section: 'Docs',
  },
  {
    slug: 'numbering',
    title: 'Derived Numbering',
    eyebrow: 'Positional coordinates, never stored',
    section: 'Docs',
  },
]
