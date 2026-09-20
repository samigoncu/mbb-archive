import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/api-error";
import { whenPermitted } from "@/lib/api/when-permitted";

describe("whenPermitted", () => {
  it("izin varsa sonucu olduğu gibi verir", async () => {
    await expect(whenPermitted(Promise.resolve(7), 0)).resolves.toBe(7);
  });

  it("403 gelirse boş değere düşer", async () => {
    const forbidden = Promise.reject(new ApiError("Yetkisiz", 403));

    await expect(whenPermitted(forbidden, 0)).resolves.toBe(0);
  });

  /** Kesinti "veri yok" gibi görünmemeli; hata yükselmeli (§33). */
  it("500 hatasını yutmaz", async () => {
    const broken = Promise.reject(new ApiError("Sunucu hatası", 500));

    await expect(whenPermitted(broken, 0)).rejects.toThrow("Sunucu hatası");
  });

  it("ağ hatasını yutmaz", async () => {
    const offline = Promise.reject(new TypeError("fetch failed"));

    await expect(whenPermitted(offline, 0)).rejects.toThrow("fetch failed");
  });

  it("401 yutulmaz: oturum düşmüşse kullanıcı bunu görmeli", async () => {
    const expired = Promise.reject(new ApiError("Oturum yok", 401));

    await expect(whenPermitted(expired, 0)).rejects.toThrow("Oturum yok");
  });
});
