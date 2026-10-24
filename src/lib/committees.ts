// The congregation's committees (docs/PLAN.md §3.4).
// Used to seed the database. Once the admin area exists (M2), the database is the source of truth.

export type CommitteeSeed = {
  slug: string;
  name: string;
};

export const COMMITTEES: readonly CommitteeSeed[] = [
  { slug: "organizing", name: "Organizing" },
  { slug: "testify", name: "Testify" },
  { slug: "flowering", name: "Flowering" },
  { slug: "music", name: "Choir / Music / Orchestra" },
  { slug: "first-aid", name: "First Aid" },
  { slug: "catering", name: "Catering" },
  { slug: "comms-media", name: "Communication & Media" },
  { slug: "drama-poetry", name: "Drama & Poetry" },
  { slug: "secretariat", name: "Secretariat" },
];
