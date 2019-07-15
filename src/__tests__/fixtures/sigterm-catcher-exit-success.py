#!/usr/bin/env python3
from time import sleep
import signal
import sys

def sigterm_handler(_signo, _stack_frame):
    print("{} RECEIVED".format(_signo))
    sys.stdout.flush()
    sys.exit(0)

signal.signal(signal.SIGTERM, sigterm_handler)
print("14 characters")
sys.stdout.flush()
sleep(30)
print("28 characters")
sys.stdout.flush()
