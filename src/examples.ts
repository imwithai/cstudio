import type { Example } from "./types";
export const examples: Example[] = [
  {
    name: "Add two numbers",
    input: "10 20",
    code: `#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;
    cout << a + b << endl;
    return 0;
}`,
  },
  {
    name: "Hello World",
    input: "",
    code: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}`,
  },
  {
    name: "Sort a vector",
    input: "5\n8 3 1 9 4",
    code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    if (!(cin >> n) || n < 0) return 1;
    vector<int> values(n);
    for (int &v : values) cin >> v;
    sort(values.begin(), values.end());
    for (int v : values) cout << v << ' ';
    cout << endl;
}`,
  },
  {
    name: "Matrix column products",
    input: "2 3\n1 2 3\n4 5 6",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int rows, cols;
    if (!(cin >> rows >> cols) || rows < 0 || cols < 0) return 1;
    vector<long long> products(cols, 1);
    for (int r = 0; r < rows; ++r) {
        for (auto &product : products) {
            int value;
            if (!(cin >> value)) return 1;
            product *= value;
        }
    }
    for (auto product : products) cout << product << ' ';
    cout << endl;
}`,
  },
];
