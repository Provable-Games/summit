use summit::models::beast::BeastUtilsTrait;
use crate::helpers::beast_builder::create_beast_with_stats;

#[test]
fn test_crit_chance_zero_luck() {
    let beast = create_beast_with_stats(0, 0);
    let crit = beast.crit_chance();
    assert(crit == 0, 'Crit should be 0%');
}

#[test]
fn test_crit_chance_luck_1() {
    let beast = create_beast_with_stats(1, 0);
    let crit = beast.crit_chance();
    assert(crit == 10, 'Crit should be 10%');
}

#[test]
fn test_crit_chance_luck_2() {
    let beast = create_beast_with_stats(2, 0);
    let crit = beast.crit_chance();
    assert(crit == 14, 'Crit should be 14%');
}

#[test]
fn test_crit_chance_luck_3() {
    let beast = create_beast_with_stats(3, 0);
    let crit = beast.crit_chance();
    assert(crit == 17, 'Crit should be 17%');
}

#[test]
fn test_crit_chance_luck_4() {
    let beast = create_beast_with_stats(4, 0);
    let crit = beast.crit_chance();
    assert(crit == 19, 'Crit should be 19%');
}

#[test]
fn test_crit_chance_luck_5() {
    let beast = create_beast_with_stats(5, 0);
    let crit = beast.crit_chance();
    assert(crit == 20, 'Crit should be 20%');
}

#[test]
fn test_crit_chance_luck_6() {
    let beast = create_beast_with_stats(6, 0);
    let crit = beast.crit_chance();
    // 2000 + (6-5)*100 = 2000 + 100 = 2100 bp = 21%
    assert(crit == 21, 'Crit should be 21%');
}

#[test]
fn test_crit_chance_luck_50() {
    let beast = create_beast_with_stats(50, 0);
    let crit = beast.crit_chance();
    // 2000 + (50-5)*100 = 2000 + 4500 = 6500 bp = 65%
    assert(crit == 65, 'Crit should be 65%');
}

#[test]
fn test_crit_chance_luck_70() {
    let beast = create_beast_with_stats(70, 0);
    let crit = beast.crit_chance();
    // 2000 + (70-5)*100 = 2000 + 6500 = 8500 bp = 85%
    assert(crit == 85, 'Crit should be 85%');
}

#[test]
fn test_crit_chance_luck_71() {
    let beast = create_beast_with_stats(71, 0);
    let crit = beast.crit_chance();
    // 8500 + (71-70)*50 = 8500 + 50 = 8550 bp = 85%
    assert(crit == 85, 'Crit should be 85%');
}

#[test]
fn test_crit_chance_luck_100() {
    let beast = create_beast_with_stats(100, 0);
    let crit = beast.crit_chance();
    // 8500 + (100-70)*50 = 8500 + 1500 = 10000 bp = 100%
    assert(crit == 100, 'Crit should be 100%');
}

#[test]
fn test_spirit_reduction_zero_spirit() {
    let beast = create_beast_with_stats(0, 0);
    let reduction = beast.spirit_reduction();
    assert(reduction == 0, 'Reduction should be 0');
}

#[test]
fn test_spirit_reduction_spirit_1() {
    let beast = create_beast_with_stats(0, 1);
    let reduction = beast.spirit_reduction();
    assert(reduction == 7200, 'Reduction should be 7200s');
}

#[test]
fn test_spirit_reduction_spirit_2() {
    let beast = create_beast_with_stats(0, 2);
    let reduction = beast.spirit_reduction();
    assert(reduction == 10080, 'Reduction should be 10080s');
}

#[test]
fn test_spirit_reduction_spirit_3() {
    let beast = create_beast_with_stats(0, 3);
    let reduction = beast.spirit_reduction();
    assert(reduction == 12240, 'Reduction should be 12240s');
}

#[test]
fn test_spirit_reduction_spirit_4() {
    let beast = create_beast_with_stats(0, 4);
    let reduction = beast.spirit_reduction();
    assert(reduction == 13680, 'Reduction should be 13680s');
}

#[test]
fn test_spirit_reduction_spirit_5() {
    let beast = create_beast_with_stats(0, 5);
    let reduction = beast.spirit_reduction();
    assert(reduction == 14400, 'Reduction should be 14400s');
}

#[test]
fn test_spirit_reduction_spirit_6() {
    let beast = create_beast_with_stats(0, 6);
    let reduction = beast.spirit_reduction();
    // 14400 + (6-5)*720 = 14400 + 720 = 15120
    assert(reduction == 15120, 'Reduction should be 15120s');
}

#[test]
fn test_spirit_reduction_spirit_50() {
    let beast = create_beast_with_stats(0, 50);
    let reduction = beast.spirit_reduction();
    // 14400 + (50-5)*720 = 14400 + 32400 = 46800
    assert(reduction == 46800, 'Reduction should be 46800s');
}

#[test]
fn test_spirit_reduction_spirit_70() {
    let beast = create_beast_with_stats(0, 70);
    let reduction = beast.spirit_reduction();
    // 14400 + (70-5)*720 = 14400 + 46800 = 61200
    assert(reduction == 61200, 'Reduction should be 61200s');
}

#[test]
fn test_spirit_reduction_spirit_71() {
    let beast = create_beast_with_stats(0, 71);
    let reduction = beast.spirit_reduction();
    // 61200 + (71-70)*360 = 61200 + 360 = 61560
    assert(reduction == 61560, 'Reduction should be 61560s');
}

#[test]
fn test_spirit_reduction_spirit_100() {
    let beast = create_beast_with_stats(0, 100);
    let reduction = beast.spirit_reduction();
    // 61200 + (100-70)*360 = 61200 + 10800 = 72000
    assert(reduction == 72000, 'Reduction should be 72000s');
}

// ==========================
// FUZZ TESTS FOR BEAST MODEL
// ==========================

#[test]
#[fuzzer(runs: 101)]
fn fuzz_test_crit_chance_bounds(luck: u8) {
    let beast = create_beast_with_stats(luck, 0);
    let crit = beast.crit_chance();

    if luck == 0 {
        assert(crit == 0, 'Luck 0 should give 0% crit');
    } else if luck == 1 {
        assert(crit == 10, 'Luck 1 should give 10% crit');
    } else if luck <= 5 {
        assert(crit >= 10 && crit <= 20, 'Low luck range invalid');
    } else if luck <= 70 {
        assert(crit >= 20 && crit <= 85, 'Mid luck range invalid');
    } else {
        assert(crit >= 85, 'High luck should be >= 85%');
    }
}

#[test]
#[fuzzer(runs: 101)]
fn fuzz_test_spirit_reduction_bounds(spirit: u8) {
    let beast = create_beast_with_stats(0, spirit);
    let reduction = beast.spirit_reduction();

    if spirit == 0 {
        assert(reduction == 0, 'Spirit 0 should give 0s');
    } else if spirit == 1 {
        assert(reduction == 7200, 'Spirit 1 should give 7200s');
    } else if spirit <= 5 {
        assert(reduction >= 7200 && reduction <= 14400, 'Low spirit range invalid');
    } else if spirit <= 70 {
        assert(reduction >= 14400 && reduction <= 61200, 'Mid spirit range invalid');
    } else {
        assert(reduction >= 61200, 'High spirit range invalid');
    }
}

#[test]
#[fuzzer(runs: 101)]
fn fuzz_test_crit_chance_monotonic(luck: u8) {
    if luck > 0 {
        let beast_current = create_beast_with_stats(luck, 0);
        let beast_previous = create_beast_with_stats(luck - 1, 0);

        let crit_current = beast_current.crit_chance();
        let crit_previous = beast_previous.crit_chance();

        assert(crit_current >= crit_previous, 'Crit should increase with luck');
    }
}

#[test]
#[fuzzer(runs: 101)]
fn fuzz_test_spirit_reduction_monotonic(spirit: u8) {
    if spirit > 1 {
        let beast_current = create_beast_with_stats(0, spirit);
        let beast_previous = create_beast_with_stats(0, spirit - 1);

        let reduction_current = beast_current.spirit_reduction();
        let reduction_previous = beast_previous.spirit_reduction();

        assert(reduction_current >= reduction_previous, 'Reduction should increase');
    }
}
