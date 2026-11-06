import {del, put} from "@vercel/blob";

export type UploadedBlob = {
  url: string;
  pathname: string;
};

export type BlobStorage = {
  putImage(input: {
    pathname: string;
    file: File;
    contentType: string;
  }): Promise<UploadedBlob>;
  delete(url: string): Promise<void>;
};

/**
 * Vercel Blob is public for the profile images this app stores. The pathname
 * always starts with the tenant or user id, and `addRandomSuffix` makes a
 * replaced image immediately cacheable without an invalidation step.
 */
export const blobStorage: BlobStorage = {
  async putImage({pathname, file, contentType}) {
    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: true,
      contentType,
      cacheControlMaxAge: 60 * 60 * 24 * 30,
    });

    return {url: blob.url, pathname: blob.pathname};
  },

  async delete(url) {
    await del(url);
  },
};
