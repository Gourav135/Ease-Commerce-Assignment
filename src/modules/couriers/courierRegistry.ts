import { AppError } from "../../utils/appError";

import { CourierAdapter } from "./base/courier.types";
import { UrbaneBoltCourierAdapter } from "./urbanebolt/urbaneboltCourierAdapter";
import { testCourierAdapter } from "./test/testCourierAdapter";

export class CourierRegistry {
  private readonly adapters = new Map<string, CourierAdapter>();

  constructor() {
    const urbaneboltAdapter = new UrbaneBoltCourierAdapter();
    const testAdapter = new testCourierAdapter();

    this.adapters.set(testAdapter.partnerCode, testAdapter);
    this.adapters.set(urbaneboltAdapter.partnerCode, urbaneboltAdapter);
  }

  getAdapter(partnerCode: string): CourierAdapter {
    const adapter = this.adapters.get(partnerCode);

    if (!adapter) {
      throw new AppError(400, "UNSUPPORTED_COURIER", "Unsupported courier partner", {
        supported_partners: Array.from(this.adapters.keys()),
      });
    }

    return adapter;
  }

  getAdapterByCourierId(courierId: number): CourierAdapter {
    for (const adapter of this.adapters.values()) {
      if (adapter.courierId === courierId) {
        return adapter;
      }
    }

    throw new AppError(
      500,
      "COURIER_ADAPTER_NOT_FOUND",
      `No adapter registered for courier_id ${courierId}`,
    );
  }
}
