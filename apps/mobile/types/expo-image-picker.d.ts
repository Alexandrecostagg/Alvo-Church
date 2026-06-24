declare module "expo-image-picker" {
  export interface ImagePickerAsset {
    uri: string;
    width: number;
    height: number;
    type?: "image" | "video";
  }
  export interface ImagePickerResult {
    canceled: boolean;
    assets: ImagePickerAsset[];
  }
  export interface ImagePickerOptions {
    mediaTypes?: ("images" | "videos" | "livePhotos")[];
    allowsEditing?: boolean;
    quality?: number;
  }
  export function launchImageLibraryAsync(options?: ImagePickerOptions): Promise<ImagePickerResult>;
  export function launchCameraAsync(options?: ImagePickerOptions): Promise<ImagePickerResult>;
}
