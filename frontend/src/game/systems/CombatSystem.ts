/**
 * CombatSystem - Handles damage calculation and combat state
 * 
 * Damage Formula:
 *   Base Damage = (WPM / 60) * (Accuracy / 100)
 *   Total Damage = Base * Upgrades * Combo * Critical
 */

export interface DamageInput {
  wpm: number;
  accuracy: number;
  upgrades: Record<string, number>;
  combo: number;
  isCritical: boolean;
}

export class CombatSystem {
  private monsterHP: number = 100;
  private monsterMaxHP: number = 100;
  private comboCount: number = 0;

  constructor(monsterMaxHP: number = 100) {
    this.monsterMaxHP = monsterMaxHP;
    this.monsterHP = monsterMaxHP;
    console.log(`[CombatSystem] Initialized with ${monsterMaxHP} HP`);
  }

  /**
   * Calculate damage from typing performance
   */
  calculateDamage(input: DamageInput): number {
    // Base damage from typing performance
    const baseDamage = (input.wpm / 60) * (input.accuracy / 100);

    // Upgrade multipliers (from GDD v1.0 Section 5.4.3)
    const upgradeMultiplier =
      (1 + (input.upgrades.typing_mastery || 0) * 0.15) * // +15% per level
      (1 + (input.upgrades.focus_enhancer || 0) * 0.10) * // +10% per level
      (1 + (input.upgrades.critical_insight || 0) * 0.10) * // +10% per level
      (1 + (input.upgrades.combo_keeper || 0) * 0.05); // +5% per level

    // Combo multiplier
    const comboMultiplier = input.combo;

    // Critical hit (2x damage)
    const critMultiplier = input.isCritical ? 2.0 : 1.0;

    const totalDamage = baseDamage * upgradeMultiplier * comboMultiplier * critMultiplier;

    console.log(`[CombatSystem] Damage calculated:`, {
      baseDamage: baseDamage.toFixed(2),
      upgradeMultiplier: upgradeMultiplier.toFixed(2),
      comboMultiplier,
      critMultiplier,
      totalDamage: totalDamage.toFixed(2),
    });

    return totalDamage;
  }

  /**
   * Apply damage to monster and update combo
   */
  applyDamage(damage: number): number {
    this.monsterHP -= damage;
    if (this.monsterHP < 0) this.monsterHP = 0;

    // Increment combo if monster still alive
    if (this.monsterHP > 0) {
      this.comboCount++;
    }

    console.log(`[CombatSystem] Monster HP: ${this.monsterHP}/${this.monsterMaxHP} (Combo: ${this.comboCount})`);

    return this.monsterHP;
  }

  /**
   * Get current combo multiplier
   */
  getComboMultiplier(): number {
    if (this.comboCount >= 10) return 2.0;
    if (this.comboCount >= 5) return 1.5;
    if (this.comboCount >= 3) return 1.2;
    return 1.0;
  }

  /**
   * Reset combo (e.g., on mistake)
   */
  resetCombo(): void {
    console.log(`[CombatSystem] Combo reset (was ${this.comboCount})`);
    this.comboCount = 0;
  }

  /**
   * Reset combat state for new battle
   */
  reset(monsterMaxHP?: number): void {
    if (monsterMaxHP) {
      this.monsterMaxHP = monsterMaxHP;
    }
    this.monsterHP = this.monsterMaxHP;
    this.comboCount = 0;
    console.log(`[CombatSystem] Reset for new battle (${this.monsterMaxHP} HP)`);
  }

  /**
   * Get monster HP percentage (for UI)
   */
  getHPPercentage(): number {
    return this.monsterHP / this.monsterMaxHP;
  }

  /**
   * Check if monster is defeated
   */
  isDefeated(): boolean {
    return this.monsterHP <= 0;
  }

  /**
   * Get current combo count
   */
  getComboCount(): number {
    return this.comboCount;
  }
}
