import type Toast from "../components/Toast.vue";

type toastType = InstanceType<typeof Toast>
export class ToastManger {
  private static _toast: toastType | void;
  public static isLoading: boolean = true;
  static init(toast: toastType) {
    this.isLoading = false;
    this._toast = toast;
  }
  static useToast(): toastType | void {
    return this._toast
  }
}