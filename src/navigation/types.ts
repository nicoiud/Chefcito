export type RootStackParamList = {
  RecipeList: undefined;
  RecipeDetail: { recipeId: string };
  CookMode: { recipeId: string };
  IngredientCheck: { recipeId: string; stepIndex: number };
  VoiceAssistant: { recipeId: string; stepIndex: number };
};
