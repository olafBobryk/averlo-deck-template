// A text's plain words (feature 003, T311): its key-phrase marks (`**…**`)
// dropped, so labels, tips, alt text and keys read the words alone. The
// deck's `say` (src/deck/SlideBody.tsx) for a plain string.
export const words = (text: string) => text.replaceAll("**", "");
