import runpy
import unittest

m = runpy.run_path(__file__.replace('test-chunky-idle.py', 'chunky-idle.py'))
decide = m['decision']

class IdlePolicy(unittest.TestCase):
    def test_health_thresholds_and_multiple_reasons(self):
        reasons = m['health_reasons']
        self.assertEqual(reasons(18.5,44.99,768,100), [])
        self.assertEqual(reasons(18.49,45,767.99,99.99),
                         ['low_tps','high_mspt','low_memory','low_disk'])
        self.assertEqual(reasons(20,10,700,500), ['low_memory'])

    def test_wait_and_resume(self):
        self.assertEqual(decide(100, None, None, 0, 0, True, False), ('pause',100,0))
        self.assertEqual(decide(399,100,None,0,0,True,False)[0], 'pause')
        self.assertEqual(decide(400,100,None,0,0,True,False)[0], 'run')

    def test_join_resets_wait(self):
        mode, idle, cool = decide(500,100,400,0,1,True,False)
        self.assertEqual((mode,idle), ('pause',None))
        self.assertEqual(decide(501,idle,None,cool,0,True,False)[0], 'pause')

    def test_guard_conditions(self):
        for safe, hold in [(False,False),(True,True),(False,True)]:
            self.assertEqual(decide(500,100,400,0,0,safe,hold)[:2], ('pause',None))

    def test_duty_cycle(self):
        mode,idle,cool = decide(520,100,400,0,0,True,False)
        self.assertEqual((mode,idle,cool), ('pause',100,580))
        self.assertEqual(decide(579,idle,None,cool,0,True,False)[0], 'pause')
        self.assertEqual(decide(580,idle,None,cool,0,True,False)[0], 'run')

if __name__ == '__main__':
    unittest.main()
