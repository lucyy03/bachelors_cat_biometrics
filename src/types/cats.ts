export interface Cat {
    id: string;
    breed: string;
    name: string;
    age: number;
    imageUrl: string;
    reviewCount: number;
    averageScore: number;
    addedBy: string;
    addedAt: string;
}

export interface CatReview {
    mouth: number;
    eyes: number;
    ears: number;
}
