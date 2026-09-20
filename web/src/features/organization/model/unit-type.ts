/**
 * Teşkilat seviyesi: daire başkanlığı, şube müdürlüğü, servis…
 *
 * <para>
 * Kurumun kalıbı eskiden yalnız birim adlarının içinde yaşıyordu; sistem
 * "bu bir daire başkanlığıdır" bilgisini tutmuyordu. Artık tanım verisidir.
 * </para>
 */
export type UnitTypeItem = {
  code: string;
  name: string;
  /** Teşkilattaki derinlik; küçük olan üsttedir. */
  level: number;
  /** Bu seviyeye doğrudan personel bağlanabilir mi. */
  canHoldMembers: boolean;
  isActive: boolean;
  /** Kurulumla gelen seviye; yeniden adlandırılır ama silinmez. */
  isBuiltIn: boolean;
  unitCount: number;
  /** Bunun altına açılabilecek seviyeler. */
  allowedChildCodes: string[];
};
