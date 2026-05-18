"""
Tekton Trading Box — Scent Controller
GPIO driver for the two-solenoid scent system.
Controls Givenchy Pi (bullish) and Fart Spray (bearish) via MOSFETs.
"""

import time
import threading
from typing import Optional


# GPIO pin assignments (Raspberry Pi 5)
SCENT_BULLISH_PIN = 17  # Givenchy Pi solenoid
SCENT_BEARISH_PIN = 27  # Fart spray solenoid

# Safety limits
MAX_PUFF_DURATION = 0.5    # seconds
MIN_PUFF_INTERVAL = 900    # 15 minutes between puffs
MAX_PUFFS_PER_DAY = 12
QUIET_HOURS_START = 23     # 11 PM
QUIET_HOURS_END = 7        # 7 AM


class ScentController:
    """
    Controls the two-solenoid scent system.
    Bullish = Givenchy Pi (GPIO 17)
    Bearish = Fart Spray (GPIO 27)
    """

    def __init__(self, use_gpio: bool = True, simulation: bool = False):
        self.use_gpio = use_gpio and not simulation
        self.simulation = simulation
        self.gpio = None
        self.puff_count_today = 0
        self.last_puff_time = 0
        self.puff_history = []  # [(timestamp, bias, duration), ...]
        self._lock = threading.Lock()

        if self.use_gpio:
            try:
                import RPi.GPIO as GPIO
                self.gpio = GPIO
                GPIO.setmode(GPIO.BCM)
                GPIO.setup(SCENT_BULLISH_PIN, GPIO.OUT, initial=GPIO.LOW)
                GPIO.setup(SCENT_BEARISH_PIN, GPIO.OUT, initial=GPIO.LOW)
                print(f"[ScentController] GPIO initialized on pins {SCENT_BULLISH_PIN}, {SCENT_BEARISH_PIN}")
            except (ImportError, RuntimeError) as e:
                print(f"[ScentController] GPIO unavailable ({e}), switching to simulation")
                self.use_gpio = False
                self.simulation = True

    def _is_quiet_hours(self) -> bool:
        """No spraying between 11PM and 7AM."""
        hour = time.localtime().tm_hour
        return hour >= QUIET_HOURS_START or hour < QUIET_HOURS_END

    def _can_puff(self) -> bool:
        """Check safety limits before allowing a puff."""
        now = time.time()

        # Reset daily counter at midnight
        if len(self.puff_history) > 0:
            last_puff = self.puff_history[-1][0]
            last_day = time.localtime(last_puff).tm_mday
            today = time.localtime(now).tm_mday
            if today != last_day:
                self.puff_count_today = 0

        if self._is_quiet_hours():
            return False

        if self.puff_count_today >= MAX_PUFFS_PER_DAY:
            return False

        if (now - self.last_puff_time) < MIN_PUFF_INTERVAL:
            return False

        return True

    def trigger_scent(self, bias: str, duration: float = 0.3) -> bool:
        """
        Trigger a scent puff for the given bias.
        bias: 'bullish' or 'bearish'
        duration: seconds to hold solenoid open (0.1 - 0.5)
        Returns True if spray was triggered, False if blocked by safety.
        """
        if bias not in ("bullish", "bearish"):
            return False

        with self._lock:
            if not self._can_puff():
                return False

            duration = max(0.1, min(duration, MAX_PUFF_DURATION))

            if bias == "bullish":
                pin = SCENT_BULLISH_PIN
                scent_name = "Givenchy Pi"
            else:
                pin = SCENT_BEARISH_PIN
                scent_name = "Fart Spray"

            if self.use_gpio:
                self.gpio.output(pin, self.gpio.HIGH)
                time.sleep(duration)
                self.gpio.output(pin, self.gpio.LOW)
            elif self.simulation:
                action = "PIFF Pi!" if bias == "bullish" else "PIFF Fart!"
                print(f"[ScentController] {action} ({scent_name}, {duration}s)")

            now = time.time()
            self.puff_count_today += 1
            self.last_puff_time = now
            self.puff_history.append((now, bias, duration))
            return True

    def trigger_bias_change(self, new_bias: str):
        """
        Called by USDT.D tracker when bias changes.
        Only triggers scent on actual bias change (not every check).
        """
        if new_bias in ("bullish", "bearish"):
            self.trigger_scent(new_bias)

    def get_status(self) -> dict:
        return {
            "available": self.use_gpio or self.simulation,
            "simulation": self.simulation,
            "puffs_today": self.puff_count_today,
            "max_puffs": MAX_PUFFS_PER_DAY,
            "last_puff_time": self.last_puff_time,
            "min_interval": MIN_PUFF_INTERVAL,
            "quiet_hours": self._is_quiet_hours(),
            "puff_history_count": len(self.puff_history),
        }

    def cleanup(self):
        """Clean up GPIO on shutdown."""
        if self.use_gpio and self.gpio:
            self.gpio.output(SCENT_BULLISH_PIN, self.gpio.LOW)
            self.gpio.output(SCENT_BEARISH_PIN, self.gpio.LOW)
            self.gpio.cleanup()
            print("[ScentController] GPIO cleaned up")