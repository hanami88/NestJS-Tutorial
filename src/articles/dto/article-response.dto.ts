export class AuthorResponseDto {
  username: string;
  bio: string | null;
  image: string | null;
  following: boolean;
}

export class ArticleDataDto {
  slug: string;
  title: string;
  description: string;
  body: string;
  tagList: string[];
  createdAt: Date;
  updatedAt: Date;
  favorited: boolean;
  favoritesCount: number;
  author: AuthorResponseDto;
}

// Dùng cho: Create, Get, Update, Favorite, Unfavorite
export class SingleArticleResponseDto {
  article: ArticleDataDto;
}

// Dùng cho: List Articles, Feed Articles
export class MultipleArticlesResponseDto {
  articles: ArticleDataDto[];
  articlesCount: number;
}
