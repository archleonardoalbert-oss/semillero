"""Comprobaciones numéricas de los ejemplos de la asignatura de Estadística (solo biblioteca estándar)."""
import math


def phi(z):
    return 0.5 * (1 + math.erf(z / math.sqrt(2)))


def binom_cdf(k, n, p=0.5):
    return sum(math.comb(n, i) * p**i * (1 - p) ** (n - i) for i in range(0, k + 1))


n = 5
print('c01 uniforme n=5: 2xbar', 1 / (3 * n), 'M', 2 / ((n + 1) * (n + 2)), '(n+1)/n M', 1 / (n * (n + 2)))
print('SE 200:', math.sqrt(.86 * .14 / 200), math.sqrt(.87 * .13 / 200), math.sqrt(.85 * .15 / 200))
mu, s, n = 1, 2, 10
cs = mu**2 / (mu**2 + s**2 / n)
print('encogimiento c*', cs, 'ECM(c*)', (cs - 1) ** 2 * mu**2 + cs**2 * s**2 / n, 'ECM(1)', s**2 / n)
