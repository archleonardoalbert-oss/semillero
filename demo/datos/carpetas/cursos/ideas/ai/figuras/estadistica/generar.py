"""Figuras estáticas de la asignatura «Estadística e inferencia para evaluar modelos».

Uso: python3 generar.py [nombre ...]   (sin argumentos, las genera todas)
Fondo oscuro y la misma paleta que las escenas: cian = objeto principal, ámbar = lo que se construye,
verde/rojo = correcto/incorrecto, violeta = secundario.
"""
import math
import os
import sys

import matplotlib

matplotlib.use('Agg')
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

AQUI = os.path.dirname(os.path.abspath(__file__))
C = dict(cian='#3aa9bb', ciruela='#b8509f', ambar='#c99448', verde='#4aa97c', violeta='#7d6cc4',
         texto='#d6d1c2', texto2='#a9a596', tenue='#737890', rojo='#d0656c', fondo='#141821', rejilla='#262b38')

plt.rcParams.update({
    'figure.facecolor': C['fondo'], 'axes.facecolor': C['fondo'], 'savefig.facecolor': C['fondo'],
    'axes.edgecolor': C['tenue'], 'axes.labelcolor': C['texto'], 'xtick.color': C['texto2'],
    'ytick.color': C['texto2'], 'text.color': C['texto'], 'axes.titlecolor': C['texto'],
    'grid.color': C['rejilla'], 'axes.grid': True, 'font.size': 11, 'axes.titlesize': 12,
    'legend.facecolor': C['fondo'], 'legend.edgecolor': C['tenue'], 'axes.spines.top': False,
    'axes.spines.right': False,
})


def guardar(fig, nombre):
    fig.tight_layout()
    fig.savefig(os.path.join(AQUI, nombre), dpi=150)
    plt.close(fig)
    print('ok', nombre)


def phi(z):
    return 0.5 * (1 + math.erf(z / math.sqrt(2)))


def dens_normal(x, m=0.0, s=1.0):
    return np.exp(-0.5 * ((x - m) / s) ** 2) / (s * math.sqrt(2 * math.pi))


# ---------------------------------------------------------------- c01
def uniforme_estimadores():
    rng = np.random.default_rng(1)
    n, theta, R = 5, 1.0, 200_000
    X = rng.uniform(0, theta, size=(R, n))
    est = {
        r'$2\bar X$ (insesgado)': (2 * X.mean(1), C['violeta']),
        r'$M=\max X_i$ (sesgado)': (X.max(1), C['ambar']),
        r'$\frac{n+1}{n}M$ (insesgado)': ((n + 1) / n * X.max(1), C['cian']),
    }
    fig, axs = plt.subplots(1, 3, figsize=(11, 3.4), sharey=True)
    bins = np.linspace(0, 2, 81)
    for ax, (nombre, (v, col)) in zip(axs, est.items()):
        ax.hist(v, bins=bins, density=True, color=col, alpha=0.85)
        ax.axvline(theta, color=C['verde'], ls='--', lw=1.6, label=r'$\theta=1$')
        ax.axvline(v.mean(), color=C['texto'], lw=1.2, label='media')
        ecm = np.mean((v - theta) ** 2)
        ax.set_title(nombre)
        ax.text(0.03, 0.95, f'sesgo = {v.mean() - theta:+.3f}\nvar = {v.var():.4f}\nECM = {ecm:.4f}',
                transform=ax.transAxes, va='top', fontsize=10, family='monospace')
        ax.set_xlim(0, 2)
        ax.set_xlabel('estimación')
    axs[0].legend(loc='upper right', fontsize=9)
    guardar(fig, 'c01-uniforme-estimadores.png')


FIGURAS = {f.__name__: f for f in [uniforme_estimadores]}

if __name__ == '__main__':
    for nombre in sys.argv[1:] or FIGURAS:
        FIGURAS[nombre]()
