import random
import json

def generateRandomText(length):
    return ''.join(random.choice('abcdefghijklmnopqrstuvwxyz') for _ in range(length))
sampleCount = int(input())
def solve(N, T):
    output = []
    for i in range(N):
        output.append(str(T[i]))
    return "\n".join(output)
randomSamples = []
for i in range(sampleCount):
    N = random.randint(1, 100)
    T = [generateRandomText(random.randint(1, 100)) for _ in range(N)]
    with open(f"testcases/random-{i+1}.in", "w") as f:
        f.write(f"{N}\n")
        for t in T:
            f.write(f"{t}\n")
    with open(f"testcases/random-{i+1}.out", "w") as f:
        f.write(solve(N, T) + "\n")
    print(i)
    randomSamples.append("random-" + str(i + 1))

oldTestcaseJson = json.load(open("./tests.json", "r"))
oldTestcaseJson["tests"]["random"]  = randomSamples
with open("./tests.json", "w") as f:
    json.dump(oldTestcaseJson, f, indent=4)
print("Random test cases generated successfully.")