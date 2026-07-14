declare module "expo-image-picker" {
  export interface ImagePickerAsset {
    uri: string;
    width: number;
    height: number;
    type?: "image" | "video";
    base64?: string | null;
  }
  export interface ImagePickerResult {
    canceled: boolean;
    assets: ImagePickerAsset[];
  }
  export interface ImagePickerOptions {
    mediaTypes?: ("images" | "videos" | "livePhotos")[];
    allowsEditing?: boolean;
    quality?: number;
    base64?: boolean;
    aspect?: [number, number];
  }
  export interface PermissionResponse {
    granted: boolean;
    canAskAgain?: boolean;
    status?: string;
  }
  export function launchImageLibraryAsync(options?: ImagePickerOptions): Promise<ImagePickerResult>;
  export function launchCameraAsync(options?: ImagePickerOptions): Promise<ImagePickerResult>;
  export function requestCameraPermissionsAsync(): Promise<PermissionResponse>;
}
