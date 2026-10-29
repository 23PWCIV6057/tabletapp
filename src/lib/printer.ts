import { GeoFenceConfig, OrderCard } from "@/types";
import { formatPrice } from "./geo";

// Minimal Web Serial API type declarations for direct USB/Serial ESC/POS thermal printers
interface SerialPort {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  writable?: WritableStream<Uint8Array>;
}

interface NavigatorWithSerial extends Navigator {
  serial?: {
    requestPort(): Promise<SerialPort>;
  };
}

let activeSerialPort: SerialPort | null = null;

export function isWebSerialSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((navigator as NavigatorWithSerial).serial);
}

export function isThermalPrinterConnected(): boolean {
  return activeSerialPort !== null && Boolean(activeSerialPort.writable);
}

export async function connectThermalPrinter(): Promise<boolean> {
  if (!isWebSerialSupported()) return false;
  try {
    const nav = navigator as NavigatorWithSerial;
    const port = await nav.serial!.requestPort();
    await port.open({ baudRate: 9600 });
    activeSerialPort = port;
    return true;
  } catch {
    activeSerialPort = null;
    return false;
  }
}

export async function disconnectThermalPrinter(): Promise<void> {
  if (!activeSerialPort) return;
  try {
    await activeSerialPort.close();
  } catch {
    // Ignore close error
  } finally {
    activeSerialPort = null;
  }
}

function padLine(left: string, right: string, width = 32): string {
  const cleanLeft = left.slice(0, Math.max(1, width - right.length - 1));
  const spaces = Math.max(1, width - cleanLeft.length - right.length);
  return cleanLeft + " ".repeat(spaces) + right + "\n";
}

/**
 * Sends raw ESC/POS commands directly to a connected USB/Serial 80mm/58mm thermal printer.
 * Triggers immediate hardware printing and automatic paper cutter with zero browser dialog.
 */
export async function printOrderViaEscPos(
  order: OrderCard,
  config: GeoFenceConfig,
  mode: "kot" | "bill"
): Promise<boolean> {
  if (!activeSerialPort || !activeSerialPort.writable) return false;

  const currency = config.currency || "PKR";
  const restaurantName = (config.restaurantName || "Heat Box Pizza").toUpperCase();
  const timeStr = new Date(order.createdAt).toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const encoder = new TextEncoder();
  const chunks: number[] = [];

  const pushBytes = (...bytes: number[]) => chunks.push(...bytes);
  const pushText = (text: string) => {
    const encoded = encoder.encode(text);
    encoded.forEach((b) => chunks.push(b));
  };

  // Initialize printer (ESC @)
  pushBytes(0x1b, 0x40);
  // Center align (ESC a 1)
  pushBytes(0x1b, 0x61, 0x01);
  // Bold on (ESC E 1)
  pushBytes(0x1b, 0x45, 0x01);
  pushText(`${restaurantName}\n`);
  pushBytes(0x1b, 0x45, 0x00);
  pushText(mode === "kot" ? "*** KITCHEN ORDER TICKET ***\n" : "*** CUSTOMER CASH BILL ***\n");
  pushText("--------------------------------\n");

  // Left align (ESC a 0)
  pushBytes(0x1b, 0x61, 0x00);
  pushBytes(0x1b, 0x45, 0x01);
  pushText(padLine(`TABLE: #${order.table}`, `ORDER: #${order.orderNumber}`));
  pushBytes(0x1b, 0x45, 0x00);
  pushText(`Date: ${timeStr}\n`);
  pushText("--------------------------------\n");

  for (const item of order.items) {
    const lineLeft = `${item.quantity}x ${item.name}`;
    const lineRight = mode === "bill" ? formatPrice(item.totalPrice, currency) : "";
    pushBytes(0x1b, 0x45, 0x01);
    pushText(mode === "bill" ? padLine(lineLeft, lineRight) : `${lineLeft}\n`);
    pushBytes(0x1b, 0x45, 0x00);

    if (item.selectedModifiers.length > 0) {
      pushText(`  + ${item.selectedModifiers.map((m) => m.optionName).join(", ")}\n`);
    }
    if (item.specialInstructions) {
      pushText(`  NOTE: ${item.specialInstructions}\n`);
    }
  }

  pushText("--------------------------------\n");

  if (mode === "bill") {
    pushText(padLine("Subtotal:", formatPrice(order.subtotal, currency)));
    if (order.serviceFee > 0) {
      pushText(padLine("Service Fee:", formatPrice(order.serviceFee, currency)));
    }
    pushBytes(0x1b, 0x45, 0x01);
    pushText(padLine("TOTAL DUE:", formatPrice(order.total, currency)));
    pushBytes(0x1b, 0x45, 0x00);
    pushText("--------------------------------\n");
  }

  // Center footer
  pushBytes(0x1b, 0x61, 0x01);
  pushText("Thank you for dining with us!\n");
  pushText("Powered by TableTapp\n\n\n\n");

  // Full/Partial Paper Cut (GS V A 3)
  pushBytes(0x1d, 0x56, 0x41, 0x03);

  try {
    const writer = activeSerialPort.writable.getWriter();
    await writer.write(new Uint8Array(chunks));
    writer.releaseLock();
    return true;
  } catch {
    return false;
  }
}
