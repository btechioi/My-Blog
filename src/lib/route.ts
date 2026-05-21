import { Routes } from '@constants/router';
import type { BlogPost, PostRef } from 'types/blog';

export type RouteParams<T extends Routes> = T extends Routes.Post ? BlogPost | PostRef | undefined : undefined;

/**
 * Encode slug, preserve / but escape other URL-unsafe characters, same as Hexo behavior
 * @param slug original slug
 * @returns encoded slug
 */
export const encodeSlug = (slug: string) => slug?.split('/').map(encodeURIComponent).join('/') ?? '';

export function routeBuilder<T extends Routes>(route: T, param: RouteParams<typeof route>) {
  let href: string = route;
  if (!param) return href;
  switch (route) {
    case Routes.Post: {
      // Compatible with both BlogPost and PostRef
      const link = 'data' in param ? param.data?.link : param.link;
      const slug = 'data' in param ? param.id : param.slug;
      href += `/${encodeSlug(link ?? slug)}`;
      break;
    }
    default:
      break;
  }
  return href;
}

export const showDirRoutes = [Routes.Post];
