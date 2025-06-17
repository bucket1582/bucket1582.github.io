import random

def monte_carlo_approach_for_estimation(rage_quit_count, level_count, success_probability):
    level = 0
    iteration = 0
    max_iteration = rage_quit_count # 이 정도했는데 못 깨면 rage quit 할 듯
    while level < level_count:
        if iteration >= max_iteration:
            break
        r = random.random()
        if r < success_probability:
            level += 1
        else:
            level = 0
        iteration += 1
    return iteration + 1

def monte_carlo_approach_for_estimation_with_memory(rage_quit_count, level_count, success_probability, success_probability_with_memory, max_hall_number):
    level = 0
    iteration = 0
    memory = []
    max_iteration = rage_quit_count # 이 정도했는데 못 깨면 rage quit 할 듯
    while level < level_count:
        if iteration >= max_iteration:
            break
        r = random.random()
        current_hall = random.randint(1, max_hall_number)
        if current_hall in memory:
            if r < success_probability_with_memory:
                level += 1
            else:
                level = 0
        else:
            if r < success_probability:
                level += 1
            else:
                level = 0
            memory.append(current_hall)
        iteration += 1
    return iteration + 1

probability = 0.75 # 한 사람이 한 레벨을 통과할 확률
probability_with_memory = 0.9 # 한 사람이 이미 봤던 형태의 레벨을 통과할 확률
max_hall_number = 15 # 게임에 추가할 hallway 수
rage_quit_count = 1000 # 게임을 몇 번 시도하고 빡종하겠는가?
level_count = 5 # 클리어 레벨 수

mean_one_loop = 0 # 한 사람이 한 번의 시도로 도달할 레벨 수
for i in range(1, level_count + 1):
    mean_one_loop += i * pow(probability, i - 1) * (1/4)
print(f"한 사람이 한 번의 시도로 어디까지 도달하겠는가? {mean_one_loop}")

total_seen_scenes = 0 # 한 사람이 게임을 깰 때까지 확인할 레벨 수 (naive with monte carlo)
test_iteartions = 10000
for i in range(test_iteartions):
    seen_scenes = monte_carlo_approach_for_estimation(rage_quit_count, level_count, probability)
    total_seen_scenes += seen_scenes
total_seen_scenes /= test_iteartions
print(f"한 사람이 게임을 깰 때까지 몇 개의 복도를 지나겠는가? {total_seen_scenes}")

total_seen_scenes = 0 # 완전 기억 능력을 가진 한 사람이 게임을 깰 때까지 확인할 레벨 수 (naive with monte carlo)
test_iteartions = 10000
for i in range(test_iteartions):
    seen_scenes = monte_carlo_approach_for_estimation_with_memory(rage_quit_count, level_count, probability, 1, max_hall_number)
    total_seen_scenes += seen_scenes
total_seen_scenes /= test_iteartions
print(f"완전 기억 능력을 가진 한 사람이 게임을 깰 때까지 몇 개의 복도를 지나겠는가? {total_seen_scenes}")

total_seen_scenes = 0 # 준수한 기억력을 가진 한 사람이 게임을 깰 때까지 확인할 레벨 수 (naive with monte carlo)
test_iteartions = 10000
for i in range(test_iteartions):
    seen_scenes = monte_carlo_approach_for_estimation_with_memory(rage_quit_count, level_count, probability, probability_with_memory, max_hall_number)
    total_seen_scenes += seen_scenes
total_seen_scenes /= test_iteartions
print(f"준수한 기억력을 가진 한 사람이 게임을 깰 때까지 몇 개의 복도를 지나겠는가? {total_seen_scenes}")